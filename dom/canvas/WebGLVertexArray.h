/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WEBGLVERTEXARRAY_H_
#define WEBGLVERTEXARRAY_H_

#include "WebGLBindableName.h"
#include "WebGLObjectModel.h"
#include "WebGLBuffer.h"
#include "WebGLVertexAttribData.h"

#include "nsWrapperCache.h"

#include "mozilla/LinkedList.h"

namespace mozilla {

class WebGLVertexArrayFake;

class WebGLVertexArray
    : public nsWrapperCache
    , public WebGLBindableName<GLenum>
    , public WebGLRefCountedObject<WebGLVertexArray>
    , public LinkedListElement<WebGLVertexArray>
    , public WebGLContextBoundObject
{
// -----------------------------------------------------------------------------
// PUBLIC
public:
    static WebGLVertexArray* Create(WebGLContext* context);

    void BindVertexArray() {
        /* Bind to dummy value to signal that this vertex array has
           ever been bound */
        BindTo(LOCAL_GL_VERTEX_ARRAY_BINDING);
        BindVertexArrayImpl();
    };

    virtual void GenVertexArray() = 0;
    virtual void BindVertexArrayImpl() = 0;

    GLuint GLName() const { return mGLName; }

    // -------------------------------------------------------------------------
    // IMPLEMENT PARENT CLASSES

    void Delete();

    virtual void DeleteImpl() = 0;

    WebGLContext* GetParentObject() const {
        return Context();
    }

    virtual JSObject* WrapObject(JSContext *cx) MOZ_OVERRIDE;

    NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(WebGLVertexArray)
    NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_NATIVE_CLASS(WebGLVertexArray)

    // -------------------------------------------------------------------------
    // MEMBER FUNCTIONS

    bool EnsureAttrib(GLuint index, const char *info);
    bool HasAttrib(GLuint index) {
        return index < mAttribs.Length();
    }
    bool IsAttribArrayEnabled(GLuint index) {
        return HasAttrib(index) && mAttribs[index].enabled;
    }


// -----------------------------------------------------------------------------
// PROTECTED
protected:
    explicit WebGLVertexArray(WebGLContext* aContext);

    virtual ~WebGLVertexArray() {
        MOZ_ASSERT(IsDeleted());
    };

    // -------------------------------------------------------------------------
    // MEMBERS

    nsTArray<WebGLVertexAttribData> mAttribs;
    WebGLRefPtr<WebGLBuffer> mElementArrayBuffer;

    // -------------------------------------------------------------------------
    // FRIENDSHIPS

    friend class WebGLVertexArrayFake;
    friend class WebGLContext;
};

} // namespace mozilla

#endif
